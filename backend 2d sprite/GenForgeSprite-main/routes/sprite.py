from flask_restx import Namespace, Resource, fields
from services.sprite_service import process_sprite_job, get_available_presets

# Create namespace with description
sprite_ns = Namespace(
    'sprite',
    description='Sprite generation operations'
)

# Define models for Swagger documentation
generate_request = sprite_ns.model('GenerateRequest', {
    'prompt': fields.String(
        required=True,
        description='Character description prompt',
        example='ninja warrior with katana'
    ),
    'preset': fields.String(
        required=False,
        description='Style preset name',
        example='anime_action',
        default='anime_action'
    ),
    'animations': fields.List(
        fields.String,
        required=False,
        description='List of animations to generate (defaults to all)',
        example=['idle', 'run', 'attack']
    )
})

animation_output = sprite_ns.model('AnimationOutput', {
    'sprite_sheet': fields.String(description='Path to sprite sheet PNG'),
    'gif': fields.String(description='Path to animated GIF'),
    'frame_count': fields.Integer(description='Number of frames')
})

generate_response = sprite_ns.model('GenerateResponse', {
    'job_id': fields.String(description='Unique job identifier'),
    'status': fields.String(description='Job status'),
    'prompt': fields.String(description='Original prompt'),
    'preset': fields.String(description='Preset used'),
    'canonical_image': fields.String(description='Path to canonical reference image'),
    'combined_sheet': fields.String(description='Path to combined sprite sheet'),
    'animations': fields.Raw(description='Animation outputs by name'),
    'metadata': fields.String(description='Path to metadata JSON'),
    'download_urls': fields.Raw(description='Download URLs for all outputs')
})

preset_model = sprite_ns.model('Preset', {
    'name': fields.String(description='Preset identifier'),
    'display_name': fields.String(description='Human-readable name'),
    'description': fields.String(description='Preset description'),
    'style': fields.String(description='Art style'),
    'canvas': fields.List(fields.Integer, description='Canvas dimensions [width, height]'),
    'frame_rate': fields.Integer(description='Animation frame rate'),
    'animations': fields.Raw(description='Available animations with frame counts')
})

error_model = sprite_ns.model('Error', {
    'error': fields.String(description='Error message')
})


@sprite_ns.route('/health')
class Health(Resource):
    @sprite_ns.doc('health_check')
    @sprite_ns.response(200, 'Service is healthy')
    def get(self):
        """Check if the sprite service is running"""
        return {"ok": True, "service": "sprite-generator"}


@sprite_ns.route('/generate')
class Generate(Resource):
    @sprite_ns.doc('generate_sprite')
    @sprite_ns.expect(generate_request)
    @sprite_ns.response(200, 'Sprite generated successfully', generate_response)
    @sprite_ns.response(400, 'Invalid request', error_model)
    @sprite_ns.response(500, 'Server error', error_model)
    def post(self):
        """
        Generate sprite sheet and animations from a text prompt.
        
        This endpoint takes a character description and generates:
        - A canonical reference image
        - Animation frames for each requested animation
        - Sprite sheets (PNG) for each animation
        - Animated GIFs for each animation
        - A combined sprite sheet with all animations
        - JSON metadata compatible with Unity, Godot, and Phaser.js
        """
        data = sprite_ns.payload
        
        if not data or "prompt" not in data:
            return {"error": "Missing 'prompt' in request body"}, 400
        
        try:
            result = process_sprite_job(data)
            return result
        except Exception as e:
            return {"error": str(e)}, 500


@sprite_ns.route('/presets')
class PresetList(Resource):
    @sprite_ns.doc('list_presets')
    @sprite_ns.response(200, 'List of available presets')
    def get(self):
        """
        List all available style presets.
        
        Presets define the art style, canvas size, frame rate, and available animations.
        Available presets:
        - anime_action: Dynamic anime-style characters (512x512)
        - pixel_art_rpg: Top-down RPG pixel art (64x64)
        - pixel_art_platformer: Side-scroller pixel art (64x64)
        - cartoon_platformer: Colorful cartoon style (256x256)
        - realistic_2d: High-fidelity realistic art (512x512)
        - chibi: Cute chibi-style characters (256x256)
        """
        return get_available_presets()


@sprite_ns.route('/presets/<string:preset_name>')
@sprite_ns.param('preset_name', 'The preset identifier')
class PresetDetail(Resource):
    @sprite_ns.doc('get_preset')
    @sprite_ns.response(200, 'Preset details', preset_model)
    @sprite_ns.response(404, 'Preset not found', error_model)
    def get(self, preset_name):
        """Get details of a specific preset including available animations."""
        presets = get_available_presets()
        if preset_name in presets:
            return presets[preset_name]
        return {"error": f"Preset '{preset_name}' not found"}, 404
